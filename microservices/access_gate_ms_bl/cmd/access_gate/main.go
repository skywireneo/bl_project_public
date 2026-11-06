package main

import (
	"bufio"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"auth/internal/grpc"

	"github.com/oschwald/geoip2-golang"
	"github.com/yl2chen/cidranger"
)

const DEBUG_MODE = true

func debugLog(format string, args ...interface{}) {
	if DEBUG_MODE {
		fmt.Printf("[DEBUG] "+format+"\n", args...)
	}
}

type GateConfig struct {
	TechWork          bool
	TechLogins        map[string]bool
	TechStatuses      map[string]bool
	TechTokens        map[string]bool
	GeoMode           string // "rf_only", "block_list", "disabled"
	BlockedCountries  map[string]bool
	AllowedMethods    map[string]bool
	AllowedOrigins    map[string]bool
	TimeWindowEnabled bool
	TimeWindowStart   int
	TimeWindowEnd     int
	IPBlacklistRaw    []string
	IPWhitelistRaw    []string
	IPBlacklist       cidranger.Ranger
	IPWhitelist       cidranger.Ranger
	UABlacklist       map[string]bool
	HoneypotPaths     map[string]bool
	BannedTokens      map[string]bool
	RateLimitGuest    int
	RateLimitUser     int
}

var activeConfig atomic.Value
var geoDB *geoip2.Reader

type rateLimitEntry struct {
	count     int
	resetTime time.Time
}

var rateLimitMap sync.Map

func loadInitialConfig() *GateConfig {
	// Загружаем персистентные настройки WAF
	waf := loadWafSettings()

	cfg := &GateConfig{
		TechLogins:        loadMapFromFile("/app/access_whitelist_logins"),
		TechStatuses:      loadMapFromFile("/app/access_whitelist_statuses"),
		TechTokens:        loadMapFromFile("/app/access_whitelist_tokens"),
		GeoMode:           waf.GeoMode,
		AllowedMethods:    map[string]bool{"GET": true, "POST": true, "HEAD": true, "OPTIONS": true},
		AllowedOrigins:    map[string]bool{"site.com": true, "localhost": true},
		IPBlacklistRaw:    loadSliceFromFile("/app/access_whitelist_ip_blacklist"),
		IPWhitelistRaw:    loadSliceFromFile("/app/access_whitelist_ip_whitelist"),
		UABlacklist:       loadMapFromFile("/app/access_whitelist_ua_blacklist"),
		HoneypotPaths:     loadMapFromFile("/app/access_whitelist_honeypot_paths"),
		BannedTokens:      loadMapFromFile("/app/access_whitelist_banned_tokens"),
		RateLimitGuest:    waf.RateLimitGuest,
		RateLimitUser:     waf.RateLimitUser,
		TimeWindowEnabled: waf.TimeWindowEnabled,
	}

	// Парсим список стран из строки "US,CN" в map
	if waf.BlockedCountries != "" {
		m := make(map[string]bool)
		for _, c := range strings.Split(waf.BlockedCountries, ",") {
			c = strings.TrimSpace(strings.ToUpper(c))
			if c != "" {
				m[c] = true
			}
		}
		cfg.BlockedCountries = m
	}

	// Парсим временное окно, если оно включено и задано
	if cfg.TimeWindowEnabled && waf.TimeWindowConfig != "" {
		var startH, startM, endH, endM int
		if _, err := fmt.Sscanf(waf.TimeWindowConfig, "%d:%d-%d:%d", &startH, &startM, &endH, &endM); err == nil {
			cfg.TimeWindowStart = startH*60 + startM
			cfg.TimeWindowEnd = endH*60 + endM
		}
	}

	cfg.IPBlacklist = buildRanger(cfg.IPBlacklistRaw)
	cfg.IPWhitelist = buildRanger(cfg.IPWhitelistRaw)

	var err error
	geoDB, err = geoip2.Open("/app/GeoLite2-Country.mmdb")
	if err != nil {
		fmt.Printf("[WARN] GeoIP DB не загружена (/app/GeoLite2-Country.mmdb): %v\n", err)
	} else {
		fmt.Println("[INFO] GeoIP DB успешно загружена")
	}

	if data, err := os.ReadFile("/app/site_status"); err == nil {
		cfg.TechWork = strings.Contains(string(data), "technical_work: true")
	}

	fmt.Printf("[INFO] Конфигурация успешно загружена. TechWork: %v, GeoMode: %s\n", cfg.TechWork, cfg.GeoMode)
	return cfg
}

func loadMapFromFile(path string) map[string]bool {
	m := make(map[string]bool)
	file, err := os.Open(path)
	if err != nil {
		return m
	}
	defer file.Close()
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line != "" && !strings.HasPrefix(line, "#") {
			m[line] = true
		}
	}
	return m
}

func loadSliceFromFile(path string) []string {
	m := loadMapFromFile(path)
	var res []string
	for k := range m {
		res = append(res, k)
	}
	return res
}

func buildRanger(items []string) cidranger.Ranger {
	ranger := cidranger.NewPCTrieRanger()
	for _, item := range items {
		if strings.Contains(item, "/") {
			_, network, err := net.ParseCIDR(item)
			if err == nil {
				ranger.Insert(cidranger.NewBasicRangerEntry(*network))
			}
		} else {
			ip := net.ParseIP(item)
			if ip != nil {
				network := net.IPNet{IP: ip, Mask: net.CIDRMask(32, 32)}
				ranger.Insert(cidranger.NewBasicRangerEntry(network))
			}
		}
	}
	return ranger
}

func saveSliceToFile(filename string, items []string) error {
	file, err := os.Create(filename)
	if err != nil {
		return err
	}
	defer file.Close()
	for _, item := range items {
		fmt.Fprintf(file, "%s\n", item)
	}
	return nil
}

type WafSettings struct {
	GeoMode           string `json:"geo_mode"`
	BlockedCountries  string `json:"blocked_countries"` // Храним как строку "US,CN"
	TimeWindowEnabled bool   `json:"time_window_enabled"`
	TimeWindowConfig  string `json:"time_window_config"` // "09:00-21:00"
	RateLimitGuest    int    `json:"rate_limit_guest"`
	RateLimitUser     int    `json:"rate_limit_user"`
}

func loadWafSettings() WafSettings {
	settings := WafSettings{
		GeoMode:           "rf_only",
		BlockedCountries:  "",
		TimeWindowEnabled: false,
		TimeWindowConfig:  "",
		RateLimitGuest:    30,
		RateLimitUser:     100,
	}

	data, err := os.ReadFile("/app/waf_settings.json")
	if err == nil {
		if err := json.Unmarshal(data, &settings); err != nil {
			fmt.Printf("[WARN] Ошибка парсинга waf_settings.json: %v\n", err)
		} else {
			fmt.Println("[INFO] Настройки WAF успешно загружены из файла")
		}
	}
	return settings
}

func saveWafSettings(settings WafSettings) {
	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		fmt.Printf("[ERROR] Ошибка сериализации настроек WAF: %v\n", err)
		return
	}
	if err := os.WriteFile("/app/waf_settings.json", data, 0644); err != nil {
		fmt.Printf("[ERROR] Ошибка записи waf_settings.json: %v\n", err)
	} else {
		debugLog("[PERSIST] Настройки WAF сохранены в файл")
	}
}

func UpdateSiteStatus(key, value string) (bool, string) {
	currentCfg := activeConfig.Load().(*GateConfig)
	newCfg := *currentCfg

	saveWaf := func() {
		var countries []string
		for c := range newCfg.BlockedCountries {
			countries = append(countries, c)
		}
		sort.Strings(countries)
		blockedCountriesStr := strings.Join(countries, ",")

		timeConfig := ""
		if newCfg.TimeWindowEnabled && newCfg.TimeWindowEnd > 0 {
			timeConfig = fmt.Sprintf("%02d:%02d-%02d:%02d",
				newCfg.TimeWindowStart/60, newCfg.TimeWindowStart%60,
				newCfg.TimeWindowEnd/60, newCfg.TimeWindowEnd%60)
		}

		waf := WafSettings{
			GeoMode:           newCfg.GeoMode,
			BlockedCountries:  blockedCountriesStr,
			TimeWindowEnabled: newCfg.TimeWindowEnabled,
			TimeWindowConfig:  timeConfig,
			RateLimitGuest:    newCfg.RateLimitGuest,
			RateLimitUser:     newCfg.RateLimitUser,
		}
		saveWafSettings(waf)
	}

	switch key {
	case "technical_work":
		newCfg.TechWork = value == "true"
		os.WriteFile("/app/site_status", []byte(fmt.Sprintf("technical_work: %s\n", value)), 0644)

	case "geo_block_mode":
		newCfg.GeoMode = value
		saveWaf()

	case "time_window_enabled":
		newCfg.TimeWindowEnabled = (value == "true" || value == "1")
		if !newCfg.TimeWindowEnabled {
			newCfg.TimeWindowStart = 0
			newCfg.TimeWindowEnd = 0
		}
		saveWaf()

	case "time_window_config":
		if value == "false" || value == "off" || value == "" {
			newCfg.TimeWindowEnabled = false
			newCfg.TimeWindowStart = 0
			newCfg.TimeWindowEnd = 0
		} else {
			newCfg.TimeWindowEnabled = true
			var startH, startM, endH, endM int
			if _, err := fmt.Sscanf(value, "%d:%d-%d:%d", &startH, &startM, &endH, &endM); err == nil {
				newCfg.TimeWindowStart = startH*60 + startM
				newCfg.TimeWindowEnd = endH*60 + endM
				debugLog("[gRPC] Временное окно установлено: %02d:%02d - %02d:%02d", startH, startM, endH, endM)
			} else {
				return false, "неверный формат времени. Используйте ЧЧ:ММ-ЧЧ:ММ (например, 09:00-21:00)"
			}
		}
		saveWaf()

	case "rate_limit_guest":
		fmt.Sscanf(value, "%d", &newCfg.RateLimitGuest)
		saveWaf()

	case "rate_limit_user":
		fmt.Sscanf(value, "%d", &newCfg.RateLimitUser)
		saveWaf()

	case "blocked_countries":
		m := make(map[string]bool)
		for _, c := range strings.Split(value, ",") {
			c = strings.TrimSpace(strings.ToUpper(c))
			if c != "" {
				m[c] = true
			}
		}
		newCfg.BlockedCountries = m
		saveWaf()

	default:
		return false, "неизвестный ключ: " + key
	}

	activeConfig.Store(&newCfg)
	debugLog("[gRPC] Конфигурация обновлена (ключ: %s, значение: %s)", key, value)
	return true, "Статус обновлён"
}

func getWhitelist(listType string) ([]string, error) {
	cfg := activeConfig.Load().(*GateConfig)
	var items []string

	switch listType {
	case "logins":
		for k := range cfg.TechLogins {
			items = append(items, k)
		}
	case "statuses":
		for k := range cfg.TechStatuses {
			items = append(items, k)
		}
	case "tokens":
		for k := range cfg.TechTokens {
			items = append(items, k)
		}
	case "ip_blacklist":
		items = cfg.IPBlacklistRaw
	case "ip_whitelist":
		items = cfg.IPWhitelistRaw
	case "ua_blacklist":
		for k := range cfg.UABlacklist {
			items = append(items, k)
		}
	case "honeypot_paths":
		for k := range cfg.HoneypotPaths {
			items = append(items, k)
		}
	case "banned_tokens":
		for k := range cfg.BannedTokens {
			items = append(items, k)
		}
	default:
		return nil, fmt.Errorf("неизвестный тип списка: %s", listType)
	}
	return items, nil
}

func updateWhitelist(listType string, items []string) (bool, string) {
	currentCfg := activeConfig.Load().(*GateConfig)
	newCfg := *currentCfg

	var cleanItems []string
	for _, item := range items {
		item = strings.TrimSpace(item)
		if item != "" {
			cleanItems = append(cleanItems, item)
		}
	}

	switch listType {
	case "logins":
		newCfg.TechLogins = sliceToMap(cleanItems)
		saveSliceToFile("/app/access_whitelist_logins", cleanItems)
	case "statuses":
		newCfg.TechStatuses = sliceToMap(cleanItems)
		saveSliceToFile("/app/access_whitelist_statuses", cleanItems)
	case "tokens":
		newCfg.TechTokens = sliceToMap(cleanItems)
		saveSliceToFile("/app/access_whitelist_tokens", cleanItems)
	case "ip_blacklist":
		newCfg.IPBlacklistRaw = cleanItems
		newCfg.IPBlacklist = buildRanger(cleanItems)
		saveSliceToFile("/app/access_whitelist_ip_blacklist", cleanItems)
	case "ip_whitelist":
		newCfg.IPWhitelistRaw = cleanItems
		newCfg.IPWhitelist = buildRanger(cleanItems)
		saveSliceToFile("/app/access_whitelist_ip_whitelist", cleanItems)
	case "ua_blacklist":
		newCfg.UABlacklist = sliceToMap(cleanItems)
		saveSliceToFile("/app/access_whitelist_ua_blacklist", cleanItems)
	case "honeypot_paths":
		newCfg.HoneypotPaths = sliceToMap(cleanItems)
		saveSliceToFile("/app/access_whitelist_honeypot_paths", cleanItems)
	case "banned_tokens":
		newCfg.BannedTokens = sliceToMap(cleanItems)
		saveSliceToFile("/app/access_whitelist_banned_tokens", cleanItems)
	default:
		return false, "неизвестный тип списка: " + listType
	}

	activeConfig.Store(&newCfg)
	debugLog("[gRPC] Список '%s' обновлен (%d элементов)", listType, len(cleanItems))
	return true, fmt.Sprintf("Список %s успешно обновлён: %d элементов", listType, len(cleanItems))
}

func sliceToMap(items []string) map[string]bool {
	m := make(map[string]bool)
	for _, i := range items {
		m[i] = true
	}
	return m
}

type JWTData struct {
	ID              string `json:"id"`
	Login           string `json:"login"`
	Status          string `json:"status"`
	Name            string `json:"name"`
	Flag            int    `json:"flag"`
	TelegramID      string `json:"telegram_id"`
	HigherSecurity  bool   `json:"higher_security"`
	PersonaHelpType bool   `json:"persona_help_type"`
	GL              bool   `json:"gl"`
}

type JWTPayload struct {
	Data   JWTData `json:"data"`
	Verify string  `json:"verify"`
	Type   string  `json:"type"`
	IAT    int     `json:"iat"`
	Exp    int     `json:"exp"`
}

func ParseJWT(tokenString string) (*JWTData, error) {
	tokenString = strings.TrimPrefix(tokenString, "Bearer ")
	tokenString = strings.TrimSpace(tokenString)
	parts := strings.Split(tokenString, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("неверный формат токена")
	}
	payloadBytes, err := base64.RawStdEncoding.DecodeString(parts[1])
	if err != nil {
		payloadBytes, err = base64.URLEncoding.DecodeString(parts[1])
		if err != nil {
			return nil, fmt.Errorf("ошибка декодирования payload: %w", err)
		}
	}
	var payload JWTPayload
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return nil, fmt.Errorf("ошибка парсинга JSON: %w", err)
	}
	return &payload.Data, nil
}

func respondAccessGate(w http.ResponseWriter, errorCode, bypassAccess string) {
	w.Header().Set("X-Error-Code", errorCode)
	w.Header().Set("X-Bypass-Access", bypassAccess)
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func statusHandler(w http.ResponseWriter, r *http.Request) {
	cfg := activeConfig.Load().(*GateConfig)

	// Извлекаем реальный IP
	ipStr := r.Header.Get("X-Real-IP")
	if ipStr == "" {
		ipStr = strings.Split(r.RemoteAddr, ":")[0]
	}
	ip := net.ParseIP(ipStr)

	debugLog("=== ВХОДЯЩИЙ ЗАПРОС ===")
	debugLog("IP: %s | Method: %s | Path: %s | Query: %s", ipStr, r.Method, r.URL.Path, r.URL.RawQuery)

	isLocalOrPrivate := ip != nil && (ip.IsLoopback() || ip.IsPrivate())
	if isLocalOrPrivate {
		debugLog("IP определен как локальный/приватный. GeoIP и сетевые блокировки будут пропущены.")
	}

	// 1. HTTP Method Guard
	if !cfg.AllowedMethods[r.Method] {
		debugLog("[BLOCK] 403: Недопустимый HTTP метод: %s", r.Method)
		respondAccessGate(w, "403", "false")
		return
	}

	// 2. Honeypot Guard
	if cfg.HoneypotPaths[r.URL.Path] {
		debugLog("[BLOCK] 423: Сработала Honeypot-ловушка на пути: %s", r.URL.Path)
		respondAccessGate(w, "423", "false")
		return
	}

	// 3. IP Whitelist Guard
	isWhitelisted := false
	if ip != nil && cfg.IPWhitelist != nil {
		if contains, _ := cfg.IPWhitelist.Contains(ip); contains {
			isWhitelisted = true
			debugLog("[ALLOW] IP находится в белом списке. Сетевые проверки пропущены.")
		}
	}

	// 4. IP Blacklist & GeoIP Guard
	if !isWhitelisted && !isLocalOrPrivate {
		if ip != nil && cfg.IPBlacklist != nil {
			if contains, _ := cfg.IPBlacklist.Contains(ip); contains {
				debugLog("[BLOCK] 423: IP находится в черном списке")
				respondAccessGate(w, "423", "false")
				return
			}
		}

		if geoDB != nil && cfg.GeoMode != "disabled" && ip != nil {
			if record, err := geoDB.Country(ip); err == nil {
				country := record.Country.IsoCode
				debugLog("[GEOIP] Определена страна: %s (Режим: %s)", country, cfg.GeoMode)

				if country != "" {
					if cfg.GeoMode == "rf_only" && country != "RU" {
						debugLog("[BLOCK] 451: Страна %s заблокирована (режим rf_only)", country)
						respondAccessGate(w, "451", "false")
						return
					}
					if cfg.GeoMode == "block_list" && cfg.BlockedCountries[country] {
						debugLog("[BLOCK] 451: Страна %s находится в списке заблокированных", country)
						respondAccessGate(w, "451", "false")
						return
					}
				}
			}
		}
	}

	// 5. User-Agent Guard
	if !isWhitelisted {
		ua := strings.ToLower(r.Header.Get("User-Agent"))
		for bot := range cfg.UABlacklist {
			if strings.Contains(ua, strings.ToLower(bot)) {
				debugLog("[BLOCK] 403: Заблокированный User-Agent: %s", ua)
				respondAccessGate(w, "403", "false")
				return
			}
		}
	}

	// 6. Origin Guard
	if !isWhitelisted {
		origin := r.Header.Get("Origin")
		if origin != "" {
			host := strings.Replace(strings.Replace(origin, "https://", "", 1), "http://", "", 1)
			host = strings.Split(host, ":")[0]
			if !cfg.AllowedOrigins[host] {
				debugLog("[BLOCK] 403: Недопустимый Origin: %s (host: %s)", origin, host)
				respondAccessGate(w, "403", "false")
				return
			}
		}
	}

	var jwtData *JWTData
	tokenStr := r.Header.Get("Authorization")

	// Если в заголовке пусто — ищем токен в куке "auth_token" (для навигации браузера)
	if tokenStr == "" {
		if cookie, err := r.Cookie("auth_token"); err == nil && cookie.Value != "" {
			tokenStr = cookie.Value
			debugLog("[JWT] Токен найден в куке auth_token")
		}
	}

	// Парсим токен, если он найден
	if tokenStr != "" {
		tokenStr = strings.TrimPrefix(tokenStr, "Bearer ")
		tokenStr = strings.TrimSpace(tokenStr)

		if cfg.BannedTokens[tokenStr] {
			debugLog("[BLOCK] 423: Токен находится в списке отозванных (banned)")
			respondAccessGate(w, "423", "false")
			return
		}
		if parsed, err := ParseJWT(tokenStr); err == nil {
			jwtData = parsed
			debugLog("[JWT] Токен успешно распарсен. User ID: %s, Login: %s", jwtData.ID, jwtData.Login)
		} else {
			debugLog("[JWT] Ошибка парсинга токена: %v", err)
		}
	} else {
		debugLog("[JWT] Токен не найден ни в Authorization, ни в куке auth_token")
	}

	wikiAccess := "denied" // По умолчанию доступ закрыт

	if jwtData != nil {
		debugLog("[JWT] Данные токена для Wiki: %+v", jwtData)

		if jwtData.Status == "DEVELOPER" || jwtData.Status == "TOP_LEVEL_DEVELOPER" || jwtData.Status == "ADMIN" || jwtData.Status == "ADMINISTRATOR" || jwtData.Login == "admin" {
			wikiAccess = "admin"
			debugLog("[WIKI] Предоставлен доступ ADMIN для пользователя: %s", jwtData.Login)
		} else if jwtData.Status == "MODERATOR" {
			wikiAccess = "moderator"
			debugLog("[WIKI] Предоставлен доступ MODERATOR для пользователя: %s", jwtData.Login)
		} else {
			wikiAccess = "public"
			debugLog("[WIKI] Предоставлен доступ PUBLIC для пользователя: %s", jwtData.Login)
		}
	} else {
		debugLog("[JWT] Токен не найден или невалиден. Гость.")
	}

	debugLog("[WIKI] Итоговое решение для Nginx: X-Wiki-Access = %s", wikiAccess)

	w.Header().Set("X-Wiki-Access", wikiAccess)
	rateKey := ipStr
	limit := cfg.RateLimitGuest

	if jwtData != nil {
		rateKey = fmt.Sprintf("user_%s", jwtData.ID)
		limit = cfg.RateLimitUser
	}

	if limit > 0 {
		now := time.Now()
		val, _ := rateLimitMap.LoadOrStore(rateKey, &rateLimitEntry{count: 0, resetTime: now})
		entry := val.(*rateLimitEntry)

		if now.Sub(entry.resetTime) > time.Second {
			entry.count = 0
			entry.resetTime = now
		}

		entry.count++
		if entry.count > limit {
			debugLog("[BLOCK] 429: Превышен лимит запросов (%d/%d) для ключа: %s", entry.count, limit, rateKey)
			respondAccessGate(w, "429", "false")
			return
		}
	}

	// 8.5 Time Window Guard
	if cfg.TimeWindowEnabled {
		now := time.Now()
		currentMinutes := now.Hour()*60 + now.Minute()

		isInsideWindow := false
		if cfg.TimeWindowStart <= cfg.TimeWindowEnd {
			isInsideWindow = currentMinutes >= cfg.TimeWindowStart && currentMinutes <= cfg.TimeWindowEnd
		} else {
			isInsideWindow = currentMinutes >= cfg.TimeWindowStart || currentMinutes <= cfg.TimeWindowEnd
		}

		if !isInsideWindow && !isWhitelisted {
			debugLog("[BLOCK] 403: Доступ ограничен по времени (Текущее время: %02d:%02d, Окно: %d-%d)", now.Hour(), now.Minute(), cfg.TimeWindowStart, cfg.TimeWindowEnd)
			respondAccessGate(w, "403", "false")
			return
		}
	}

	// 9. Technical Work Guard
	if cfg.TechWork {
		debugLog("[TECH_WORK] Сайт закрыт на технические работы. Проверка исключений...")

		accessKey := r.URL.Query().Get("access_key")
		if accessKey != "" && cfg.TechTokens[accessKey] {
			debugLog("[ALLOW] 200: Доступ разрешен через access_key")
			respondAccessGate(w, "200", "true")
			return
		}

		if jwtData != nil {
			if cfg.TechLogins[jwtData.Login] || cfg.TechStatuses[jwtData.Status] {
				debugLog("[ALLOW] 200: Доступ разрешен через whitelist JWT (Login/Status)")
				respondAccessGate(w, "200", "false")
				return
			}
		}

		if cookie, err := r.Cookie("Access-Bypass"); err == nil && cookie != nil && cookie.Value == "true" {
			debugLog("[ALLOW] 200: Доступ разрешен через Cookie Access-Bypass")
			respondAccessGate(w, "200", "true")
			return
		}

		if !isWhitelisted {
			debugLog("[BLOCK] 503: Технические работы активны, исключения не сработили")
			respondAccessGate(w, "503", "false")
			return
		}
	}

	debugLog("[ALLOW] 200: Запрос успешно прошел все проверки")
	respondAccessGate(w, "200", "false")
}

func main() {
	fmt.Println("[INFO] Запуск Access Gate MS...")

	cfg := loadInitialConfig()
	activeConfig.Store(cfg)

	go func() {
		grpcPort := os.Getenv("ACCESS_GATE_MS_GRPC_PORT")
		if grpcPort == "" {
			grpcPort = "50054"
		}
		err := grpc.StartGrpcServer(grpcPort, UpdateSiteStatus, getWhitelist, updateWhitelist)
		if err != nil {
			fmt.Printf("[FATAL] Ошибка запуска gRPC сервера: %v\n", err)
			os.Exit(1)
		}
	}()

	port := os.Getenv("ACCESS_GATE_MS_INTERNAL_PORT")
	if port == "" {
		port = "3000"
	}

	http.HandleFunc("/accessgate/status", statusHandler)
	http.HandleFunc("/accessgate/test", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	fmt.Printf("[INFO] HTTP сервер запущен и слушает порт %s\n", port)
	if DEBUG_MODE {
		fmt.Println("[INFO] Режим отладки (DEBUG_MODE) включен. Логи запросов активны.")
	}

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		fmt.Printf("[FATAL] Server error: %v\n", err)
		os.Exit(1)
	}
}

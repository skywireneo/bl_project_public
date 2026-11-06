import os
import shutil
import subprocess
import json
from pathlib import Path

CONFIG_FILE = Path("config.json").resolve()
SOURCE_DIR = Path("source_docs").resolve()
OUTPUT_DIR = Path("wiki_data").resolve()
BUILD_DIR = Path("temp_build").resolve()

IMAGE_ACCESS = {
    "admin": ["common", "moderator", "admin"],
    "moderator": ["common", "moderator"],
    "public": ["common"]
}

def main():
    print("Начало сборки Wiki...")
    
    if not CONFIG_FILE.exists():
        print(f"❌ Ошибка: Файл конфигурации {CONFIG_FILE} не найден!")
        return
        
    with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    global_config = config["global"]
    roles_config = config["roles"]
    features = config["mkdocs_features"]

    features_yaml = "\n".join([f"    - {feature}" for feature in features])
    social_yaml = "\n".join([f"    - icon: {s['icon']}\n      link: {s['link']}" for s in global_config["social"]])
    
    if OUTPUT_DIR.exists():
        print(f"Очистка старой папки {OUTPUT_DIR}...")
        shutil.rmtree(OUTPUT_DIR)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)
    BUILD_DIR.mkdir(parents=True, exist_ok=True)

    for role_name, role_data in roles_config.items():
        print(f"\n Обработка роли: {role_name.upper()}")
        role_build_dir = BUILD_DIR / f"docs_{role_name}"
        role_build_dir.mkdir(parents=True, exist_ok=True)
        
        for section in role_data["sections"]:
            src_section = SOURCE_DIR / section
            if src_section.exists():
                shutil.copytree(src_section, role_build_dir / section, dirs_exist_ok=True)
                print(f"    Скопирован раздел: {section}")
            else:
                print(f"     Раздел {section} не найден в source_docs, пропущен.")
        
        images_src = SOURCE_DIR / "assets" / "images"
        images_dest = role_build_dir / "assets" / "images"
        images_dest.mkdir(parents=True, exist_ok=True)
        
        allowed_image_folders = IMAGE_ACCESS.get(role_name, ["common"])
        for img_folder in allowed_image_folders:
            src_img_folder = images_src / img_folder
            if src_img_folder.exists():
                for item in src_img_folder.iterdir():
                    dest_item = images_dest / item.name
                    if item.is_file():
                        shutil.copy2(item, dest_item)
                    elif item.is_dir():
                        shutil.copytree(item, dest_item, dirs_exist_ok=True)
                print(f"    Скопированы картинки из: {img_folder}/")
            else:
                print(f"     Папка картинок {img_folder}/ не найдена, пропущена.")
        
        for asset_file in ["logo.png", "favicon.png"]:
            src_asset = SOURCE_DIR / "assets" / asset_file
            if src_asset.exists():
                shutil.copy2(src_asset, role_build_dir / "assets" / asset_file)
        
        print("    Скопированы логотип и favicon")

        index_content = f"# База Знаний ({role_name.capitalize()})\n\n"
        index_content += "Добро пожаловать! Выберите доступный раздел:\n\n"
        for section in role_data["sections"]:
            names = {"general": "Общие инструкции", "moderator": "⚖️ Модерация", "admin": "⚙️ Администрирование"}
            index_content += f"- [{names.get(section, section.capitalize())}](/wiki/{section}/)\n"
        
        (role_build_dir / "index.md").write_text(index_content, encoding="utf-8")
        print("    Сгенерирован уникальный index.md")
        
        fonts_yaml = ""
        if "fonts" in global_config:
            fonts_yaml = f"""
  font:
    text: {global_config['fonts']['text']}
    code: {global_config['fonts']['code']}
"""
        
        mkdocs_content = f"""site_name: База Знаний ({role_name.capitalize()})
site_url: {global_config['site_url']}
use_directory_urls: true
docs_dir: {role_build_dir.resolve().as_posix()}
site_dir: {(OUTPUT_DIR / f'site_{role_name}').resolve().as_posix()}
copyright: {global_config['copyright']}
language: ru

theme:
  name: material
  logo: assets/logo.png
  favicon: assets/favicon.png
  palette:
    - scheme: {role_data['theme']['scheme']}
      primary: {role_data['theme']['primary']}
      accent: {role_data['theme']['accent']}
  features:
{features_yaml}
{fonts_yaml}
extra:
  social:
{social_yaml}

markdown_extensions:
  - attr_list
  - md_in_html
  - pymdownx.emoji:
      emoji_index: !!python/name:material.extensions.emoji.twemoji
      emoji_generator: !!python/name:material.extensions.emoji.to_svg
  - admonition
  - pymdownx.details
  - pymdownx.superfences
  - pymdownx.tabbed:
      alternate_style: true
  - pymdownx.highlight:
      anchor_linenums: true
      line_spans: __span
      pygments_lang_class: true
  - pymdownx.inlinehilite
  - pymdownx.snippets
"""
        mkdocs_file = BUILD_DIR / f"mkdocs_{role_name}.yml"
        mkdocs_file.write_text(mkdocs_content, encoding="utf-8")
        print("    Сгенерирован mkdocs конфиг")
        
        print(f"   Запуск mkdocs build для {role_name}...")
        result = subprocess.run(
            ["python", "-m", "mkdocs", "build", "-f", str(mkdocs_file.resolve())],
            capture_output=True, 
            text=True, 
            encoding="utf-8", 
            errors="replace" 
        )
        
        if result.returncode == 0:
            print("    Сборка успешна!")
        else:
            print(f"   ❌ Ошибка сборки {role_name}:")
            print(result.stderr)
            return

    print("\nУдаление временных файлов сборки...")
    shutil.rmtree(BUILD_DIR)
    
    print("\n" + "="*70)
    print("СБОРКА WIKI УСПЕШНО ЗАВЕРШЕНА!")
    print("="*70)
    print("Готовые сайты находятся в папке: wiki_data/")
    print("\nКАК ДОБАВЛЯТЬ КАРТИНКИ В ИНСТРУКЦИИ:")
    print("   1. Положи PNG файл в соответствующую папку:")
    print("      - source_docs/assets/images/common/    → для всех")
    print("      - source_docs/assets/images/moderator/ → для модератора и админа")
    print("      - source_docs/assets/images/admin/     → только для админа")
    print("   2. В MD файле используй синтаксис:")
    print("      ![Описание](../../assets/images/filename.png)")
    print("   3. Запусти этот скрипт заново")
    print("\nБЕЗОПАСНОСТЬ:")
    print("   Картинки автоматически изолируются по ролям!")
    print("   Обычный пользователь НЕ сможет получить доступ к admin-картинкам.")
    print("\n  ВАЖНО: Чтобы Nginx применил изменения, выполните команду:")
    print("docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec nginx_bl nginx -s reload")
    print("\nПРИМЕЧАНИЕ: Если вы добавили новую роль в config.json, не забудьте:")
    print("   1. Обновить логику в Go (Access Gate)")
    print("   2. Добавить новый блок elseif в Nginx")
    print("   3. Добавить маппинг в IMAGE_ACCESS в этом скрипте")
    print("="*70)

if __name__ == "__main__":
    main()
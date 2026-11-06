package grpc

import (
	"context"
	"fmt"
	"net"

	"auth/proto"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Server представляет gRPC сервер
type Server struct {
	proto.UnimplementedAccessGateServiceServer
	statusFunc          func(key, value string) (bool, string)
	whitelistFunc       func(listType string) ([]string, error)
	updateWhitelistFunc func(listType string, items []string) (bool, string)
}

// NewServer создаёт новый gRPC сервер
func NewServer(port string, statusFunc func(key, value string) (bool, string), whitelistFunc func(listType string) ([]string, error), updateWhitelistFunc func(listType string, items []string) (bool, string)) (*Server, error) {
	server := &Server{
		statusFunc:          statusFunc,
		whitelistFunc:       whitelistFunc,
		updateWhitelistFunc: updateWhitelistFunc,
	}

	return server, nil
}

// StartGrpcServer запускает gRPC сервер на указанном порту
func StartGrpcServer(port string, updateStatusFunc func(key, value string) (bool, string), whitelistFunc func(listType string) ([]string, error), updateWhitelistFunc func(listType string, items []string) (bool, string)) error {
	listener, err := net.Listen("tcp", ":"+port)
	if err != nil {
		return fmt.Errorf("ошибка создания listener: %w", err)
	}

	grpcServer := grpc.NewServer()

	server := &Server{
		statusFunc:          updateStatusFunc,
		whitelistFunc:       whitelistFunc,
		updateWhitelistFunc: updateWhitelistFunc,
	}

	proto.RegisterAccessGateServiceServer(grpcServer, server)

	fmt.Printf("gRPC сервер слушает на порту %s\n", port)
	return grpcServer.Serve(listener)
}

// UpdateStatus обрабатывает запрос на обновление статуса
func (s *Server) UpdateStatus(ctx context.Context, req *proto.UpdateStatusRequest) (*proto.UpdateStatusResponse, error) {
	if s.statusFunc == nil {
		return &proto.UpdateStatusResponse{
			Success: false,
			Message: "функция обновления статуса не инициализирована",
		}, status.Error(codes.Internal, "функция обновления статуса не инициализирована")
	}

	fmt.Printf("gRPC: Получен запрос UpdateStatus - key: %s, value: %s\n", req.GetKey(), req.GetValue())

	success, message := s.statusFunc(req.GetKey(), req.GetValue())

	return &proto.UpdateStatusResponse{
		Success: success,
		Message: message,
	}, nil
}

// GetStatusFromError извлекает сообщение об ошибке из gRPC статуса
func GetStatusFromError(err error) string {
	if err == nil {
		return ""
	}
	st, ok := status.FromError(err)
	if !ok {
		return err.Error()
	}
	return st.Message()
}

// GetWhitelist обрабатывает запрос на получение списка
func (s *Server) GetWhitelist(ctx context.Context, req *proto.GetWhitelistRequest) (*proto.GetWhitelistResponse, error) {
	if s.whitelistFunc == nil {
		return &proto.GetWhitelistResponse{
			Success: false,
			Message: "функция получения списка не инициализирована",
		}, status.Error(codes.Internal, "функция получения списка не инициализирована")
	}

	fmt.Printf("gRPC: Получен запрос GetWhitelist - list_type: %s\n", req.GetListType())

	items, err := s.whitelistFunc(req.GetListType())
	if err != nil {
		return &proto.GetWhitelistResponse{
			Success: false,
			Message: fmt.Sprintf("ошибка получения списка: %v", err),
		}, status.Error(codes.Internal, err.Error())
	}

	return &proto.GetWhitelistResponse{
		Success: true,
		Message: "список успешно получен",
		Items:   items,
	}, nil
}

// UpdateWhitelist обрабатывает запрос на обновление списка
func (s *Server) UpdateWhitelist(ctx context.Context, req *proto.UpdateWhitelistRequest) (*proto.UpdateWhitelistResponse, error) {
	if s.updateWhitelistFunc == nil {
		return &proto.UpdateWhitelistResponse{
			Success: false,
			Message: "функция обновления списка не инициализирована",
		}, status.Error(codes.Internal, "функция обновления списка не инициализирована")
	}

	fmt.Printf("gRPC: Получен запрос UpdateWhitelist - list_type: %s, items count: %d\n", req.GetListType(), len(req.GetItems()))

	success, message := s.updateWhitelistFunc(req.GetListType(), req.GetItems())

	return &proto.UpdateWhitelistResponse{
		Success: success,
		Message: message,
	}, nil
}

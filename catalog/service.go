package catalog

import (
	"context"

	"github.com/segmentio/ksuid"
)

type Service interface {
	PostProduct(ctx context.Context, name, description string, price float64) (*Product, error)
	GetProduct(ctx context.Context, id string) (*Product, error)
	GetProducts(ctx context.Context, skip, take uint64) ([]Product, error)
	GetProductByIDs(ctx context.Context, ids []string) ([]Product, error)
	SearchProducts(ctx context.Context, query string, skip, take uint64) ([]Product, error)
}

type Product struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
}

type catalogService struct {
	respository Repository
}

func NewService(r Repository) Service {
	return &catalogService{r}
}

func (s *catalogService) PostProduct(ctx context.Context, name, description string, price float64) (*Product, error) {
	p := &Product{
		Name:        name,
		Description: description,
		Price:       price,
		ID:          ksuid.New().String(),
	}

	if err := s.respository.PutProduct(ctx, *p); err != nil {
		return nil, err
	}
	return p, nil
}
func (s *catalogService) GetProduct(ctx context.Context, id string) (*Product, error) {
	return s.respository.GetProductByID(ctx, id)
}

func (s *catalogService) GetProducts(ctx context.Context, skip, take uint64) ([]Product, error) {
	if take > 100 || (skip == 0 && take == 0) {
		take = 100
	}
	return s.respository.ListProducts(ctx, skip, take)
}

func (s *catalogService) GetProductByIDs(ctx context.Context, ids []string) ([]Product, error) {
	return s.respository.ListProductsWithIDs(ctx, ids)
}

func (s *catalogService) SearchProducts(ctx context.Context, query string, skip, take uint64) ([]Product, error) {
	if take > 100 || (skip == 0 && take == 0) {
		take = 100
	}
	return s.respository.SearchProducts(ctx, query, skip, take)
}

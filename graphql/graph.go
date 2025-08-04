package main

type Server struct {
	// accountUrl *account.Client
	// catalogUrl *catalog.Client
	// orderUrl   *order.Client
}

func NewGraphQLServer(accountUrl, catalogUrl, orderUrl string) (*Server, error) {

	accountClient, err := account.NewClient(accountUrl)

	if err != nil {
		return nil, err
	}

	catalogClient, err := catalog.NewClient(catalogUrl)
	if err != nil {
		accountClient.Close()
		return nil, err
	}

	orderClient, err := order.NewClient(orderUrl)
	if err != nil {
		accountClient.Close()
		catalogClient.Close()
		return nil, err
	}

	return &Server{
		accountUrl: accountClient,
		catalogUrl: catalogClient,
		orderUrl:   orderClient,
	}, nil

}

func (s *Server) Mutation() MutationResolver {
	return &mutationResolver{
		server: s,
	}
}

func (s *Server) Query() QueryResolver {
	return &queryResolver{
		server: s,
	}
}

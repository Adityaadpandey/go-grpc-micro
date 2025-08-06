package main

import (
	"log"
	"time"

	"github.com/adityaadpandey/go-grpc-micro/account"
	"github.com/kelseyhightower/envconfig"
	"github.com/tinrab/retry"
)

type Config struct {
	DatabaseURL string `env:"DATABASE_URL,required"`
}

func main() {
	var cfg Config
	if err := envconfig.Process("", &cfg); err != nil {
		panic(err)
	}

	var r account.Repository
	retry.ForeverSleep(2*time.Second, func(_ int) (err error) {
		r, err = account.NewPostgresRepository(cfg.DatabaseURL)
		if err != nil {
			log.Println(err)
		}
		return
	})
	defer r.Close()

	log.Println("Listing on port 8080")
	s := account.NewService(r)
	log.Fatal(account.ListenGRPC(s, 8080))

}

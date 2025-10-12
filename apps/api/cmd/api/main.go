package main

import (
    "log"
    apihttp "github.com/mikalai/overnover/apps/api/internal/http"
)

func main() {
    app := apihttp.NewApp()
    if err := app.Listen(":8080"); err != nil {
        log.Fatalf("server error: %v", err)
    }
}



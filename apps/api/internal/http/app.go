package http

import "github.com/gofiber/fiber/v2"

// NewApp constructs the Fiber application with routes.
func NewApp() *fiber.App {
    app := fiber.New()
    app.Get("/", func(c *fiber.Ctx) error {
        c.Set("Content-Type", "text/plain; charset=utf-8")
        return c.SendString("Hello World 123!")
    })
    return app
}



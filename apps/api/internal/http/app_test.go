package http

import (
    "io"
    "net/http/httptest"
    "testing"

    "github.com/stretchr/testify/assert"
)

func TestRootReturnsHelloWorld(t *testing.T) {
    // Setup: create app and request
    app := NewApp()
    req := httptest.NewRequest("GET", "/", nil)
    
    // Execute: send request to app
    resp, err := app.Test(req)
    
    // Assert: verify response
    assert.NoError(t, err)
    assert.Equal(t, 200, resp.StatusCode)
    assert.Equal(t, "text/plain; charset=utf-8", resp.Header.Get("Content-Type"))
    
    // Check response body
    body, err := io.ReadAll(resp.Body)
    assert.NoError(t, err)
    assert.Equal(t, "Hello World 123!", string(body))
}

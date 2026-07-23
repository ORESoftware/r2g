package main

import (
	"testing"

	subject "__R2G_PACKAGE_NAME__"
)

func TestInstalledModule(t *testing.T) {
	if subject.Answer() != 42 {
		t.Fatal("downstream module returned the wrong answer")
	}
}

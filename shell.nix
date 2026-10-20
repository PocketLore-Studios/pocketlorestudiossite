# Development shell for NixOS: nix-shell, then just install / just dev.
{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  packages = [ pkgs.nodejs_24 pkgs.just ];
}

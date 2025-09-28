FROM rust:1.88.0-trixie

RUN cargo install mdbook mdbook-mermaid
WORKDIR /work
CMD ["mdbook", "serve", "-n", "0.0.0.0", "-p", "3030"]

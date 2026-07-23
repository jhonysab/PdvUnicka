package com.UnickaDigital.pdv.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    // WRITE_ONLY: aceita a senha no cadastro, mas nunca a devolve nas respostas da API
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String senha;

    private String perfil; // ADMIN ou FUNCIONARIO
}
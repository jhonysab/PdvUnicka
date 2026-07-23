package com.UnickaDigital.pdv.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

// Lista de compras/pedidos: coisas que clientes pediram ou produtos acabando,
// anotadas no balcão para comprar depois. Não mexe em estoque nem em caixa.
@Entity
@Data
public class ItemCompra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;
    private Integer quantidade;
    private String observacao;         // característica do produto, ex: "capa rosa, modelo 13"
    private String cliente;            // quem pediu, ex: "Maria — (21) 99999-0000" (nullable: coluna nova em tabela com dados)
    private String status;             // PENDENTE ou COMPRADO
    private LocalDateTime dataCriacao;
}

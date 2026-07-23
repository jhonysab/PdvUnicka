package com.UnickaDigital.pdv.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Data
public class Locacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    private String tema;               // Ex: "Fazendinha", "Princesas", "Super-Heróis"
    private LocalDate dataEvento;
    private LocalDate dataEntrega;     // data prevista para entregar na casa do cliente
    private LocalDate dataDevolucao;   // data prevista para recolher
    private String enderecoEntrega;    // pode ser diferente do endereço do cliente
    private double valor;
    private String formaPagamento;     // DINHEIRO, PIX, CREDITO, DEBITO
    private String status;             // RESERVADO, ENTREGUE, DEVOLVIDO, CANCELADO
    private String observacoes;
    private LocalDateTime dataCadastro;
}

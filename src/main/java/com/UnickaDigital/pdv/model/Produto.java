package com.UnickaDigital.pdv.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Entity
@Data
public class Produto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // --- Campos originais ---
    private String  nome;
    private Double  preco;
    private Integer estoque;
    private String  codigoBarras;

    // --- Informações do produto ---
    private String modelo;
    private String unidadeMedida;   // UNIDADE, KG, METRO, LITRO

    // --- Precificação ---
    private Double custoCompra;            // Preço pago ao fornecedor
    private Double margemLucro;            // Calculada automaticamente (%)

    // --- Fornecedor ---
    private String fornecedorNome;
    private String fornecedorTelefone;
    private String fornecedorEndereco;
    private String fornecedorPagamento;   // DINHEIRO, PIX, BOLETO, CREDITO, DEBITO

    // --- Localização na loja ---
    private String localizacao;            // Ex: "Vitrine central", "Prateleira 3"

    // --- Estoque mínimo ---
    private Integer estoqueMinimo;

    // --- Datas ---
    private LocalDate dataCompra;
    private LocalDate dataValidade;
}
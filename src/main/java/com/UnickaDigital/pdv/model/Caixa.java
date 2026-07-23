package com.UnickaDigital.pdv.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
@Table(indexes = {
        @Index(name = "idx_caixa_status",        columnList = "status"),
        @Index(name = "idx_caixa_data_abertura", columnList = "dataAbertura")
})
public class Caixa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String operador;

    private LocalDateTime dataAbertura;
    private LocalDateTime dataFechamento;

    private double valorInicial;       // dinheiro contado ao abrir
    private double valorContado;       // dinheiro contado ao fechar
    private double totalRecargas;      // recargas/serviços (dinheiro de passagem)
    private double recargasJae;
    private double recargasCelular;
    private double recargasContas;
    private double totalSangrias;      // snapshot gravado no fechamento
    private double totalSuprimentos;   // snapshot gravado no fechamento

    // Parte das recargas paga em cartão/PIX: consta no relatório da máquina,
    // mas NÃO entrou na gaveta. Double (aceita null) de propósito, para a
    // coluna nova não falhar ao ser criada em bancos que já têm caixas.
    private Double recargasCartao;

    private String status;             // ABERTO ou FECHADO
}

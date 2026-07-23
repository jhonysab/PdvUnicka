package com.UnickaDigital.pdv.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

// Serviço de passagem (recarga de celular, Jaé, pagamento de conta):
// o dinheiro pode entrar na gaveta, mas NÃO é faturamento da loja.
// Registrado na hora em que acontece — no fechamento o sistema soma tudo
// sozinho e grava nos campos de recargas do Caixa (relatórios continuam iguais).
@Entity
@Data
@Table(indexes = {
        @Index(name = "idx_servico_caixa_id", columnList = "caixaId")
})
public class Servico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String tipo;               // JAE, CELULAR ou CONTAS
    private double valor;
    private String formaPagamento;     // DINHEIRO, CREDITO, DEBITO, PIX
    private String descricao;          // opcional, ex: "Recarga R$20 Tim"
    private LocalDateTime dataHora;
    private Long caixaId;              // turno em que o serviço foi registrado
}

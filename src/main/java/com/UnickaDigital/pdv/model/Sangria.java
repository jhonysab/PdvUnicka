package com.UnickaDigital.pdv.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;

@Entity
@Data
@Table(indexes = @Index(name = "idx_sangria_data_hora", columnList = "dataHora"))
public class Sangria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "caixa_id")
    private Caixa caixa;

    private Double valor;

    private String motivo;

    // SANGRIA (retirada) ou SUPRIMENTO (entrada de dinheiro na gaveta).
    // Registros antigos têm tipo null e são tratados como SANGRIA.
    private String tipo;

    private LocalDateTime dataHora;
}
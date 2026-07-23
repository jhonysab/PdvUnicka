package com.UnickaDigital.pdv.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonManagedReference;

@Entity
@Data
@Table(indexes = {
        @Index(name = "idx_venda_data_hora", columnList = "dataHora"),
        @Index(name = "idx_venda_caixa_id",  columnList = "caixaId")
})
public class Venda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime dataHora;

    private Double valorTotal;   // valor final pago (já com desconto abatido)

    private Double desconto;     // desconto em R$ dado pelo operador (null = sem desconto)

    // Forma de pagamento: DINHEIRO, CREDITO, DEBITO ou PIX
    private String formaPagamento;

    private Long clienteId;

    // Caixa (turno) em que a venda foi registrada — usado nos relatórios por turno
    private Long caixaId;

    @JsonManagedReference
    @OneToMany(
            mappedBy = "venda",
            cascade = CascadeType.ALL,
            fetch = FetchType.EAGER
    )
    private List<ItemVenda> itens;
}
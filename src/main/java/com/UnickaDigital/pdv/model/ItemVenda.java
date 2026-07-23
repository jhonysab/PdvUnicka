package com.UnickaDigital.pdv.model; // Garanta que esse pacote bate com as suas pastas!

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Data;
import com.UnickaDigital.pdv.model.Venda;

@Entity
@Data
public class ItemVenda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "produto_id")
    private Produto produto;

    @ManyToOne
    @JoinColumn(name = "venda_id")
    @JsonBackReference
    private Venda venda;

    private Integer quantidade;

    private Double precoUnitario; // Salvamos o preço aqui caso o produto mude de valor no futuro!

    // Descrição digitada na venda avulsa (ex: "[AVULSO] Cabo USB").
    // Null para produtos cadastrados — as telas mostram descricao ?? produto.nome
    private String descricao;
}
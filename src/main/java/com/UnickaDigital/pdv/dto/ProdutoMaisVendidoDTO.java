package com.UnickaDigital.pdv.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor // Construtor com todos os campos (necessário para a consulta JPQL)
public class ProdutoMaisVendidoDTO {
    private String nomeProduto;
    private Long quantidadeTotal;
    private Double faturamentoTotal;
}

package com.UnickaDigital.pdv.dto;

import com.UnickaDigital.pdv.model.ItemVenda;
import java.util.List;

public class VendaRequest {

    private List<ItemVenda> itens;
    private String formaPagamento;
    private Long clienteId;
    private Double desconto; // desconto em R$ (opcional)

    public List<ItemVenda> getItens() { return itens; }
    public void setItens(List<ItemVenda> itens) { this.itens = itens; }

    public String getFormaPagamento() { return formaPagamento; }
    public void setFormaPagamento(String formaPagamento) { this.formaPagamento = formaPagamento; }

    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }

    public Double getDesconto() { return desconto; }
    public void setDesconto(Double desconto) { this.desconto = desconto; }
}

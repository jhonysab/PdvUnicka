package com.UnickaDigital.pdv.repository;

import com.UnickaDigital.pdv.dto.ProdutoMaisVendidoDTO;
import com.UnickaDigital.pdv.model.Venda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.time.LocalDateTime;

@Repository
public interface VendaRepository extends JpaRepository<Venda, Long> {

    @Query("SELECT v FROM Venda v LEFT JOIN FETCH v.itens")
    List<Venda> buscarTodasComItens();

    @Query("SELECT new com.UnickaDigital.pdv.dto.ProdutoMaisVendidoDTO(i.produto.nome, SUM(i.quantidade), SUM(i.quantidade * i.precoUnitario)) " +
            "FROM Venda v JOIN v.itens i " +
            "GROUP BY i.produto.nome " +
            "ORDER BY SUM(i.quantidade) DESC")
    List<ProdutoMaisVendidoDTO> obterProdutosMaisVendidos();

    @Query("SELECT new com.UnickaDigital.pdv.dto.ProdutoMaisVendidoDTO(i.produto.nome, SUM(i.quantidade), SUM(i.quantidade * i.precoUnitario)) " +
            "FROM Venda v JOIN v.itens i " +
            "WHERE v.dataHora BETWEEN :inicio AND :fim " +
            "GROUP BY i.produto.nome " +
            "ORDER BY SUM(i.quantidade) DESC")
    List<ProdutoMaisVendidoDTO> obterProdutosMaisVendidosPorPeriodo(
            @Param("inicio") LocalDateTime inicio,
            @Param("fim") LocalDateTime fim);

    @Query("SELECT v FROM Venda v LEFT JOIN FETCH v.itens WHERE v.dataHora BETWEEN :inicio AND :fim ORDER BY v.dataHora DESC")
    List<Venda> buscarVendasPorPeriodo(LocalDateTime inicio, LocalDateTime fim);

    List<Venda> findByClienteIdOrderByDataHoraDesc(Long clienteId);

    boolean existsByClienteId(Long clienteId);
}

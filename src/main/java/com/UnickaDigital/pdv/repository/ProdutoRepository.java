package com.UnickaDigital.pdv.repository;

import com.UnickaDigital.pdv.model.Produto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProdutoRepository extends JpaRepository<Produto, Long> {

    Optional<Produto> findByNome(String nome);

    @Query("SELECT p FROM Produto p WHERE p.estoqueMinimo IS NOT NULL AND p.estoque <= p.estoqueMinimo AND p.nome != 'VENDA AVULSA' ORDER BY p.estoque ASC")
    List<Produto> findProdutosAbaixoDoMinimo();
}

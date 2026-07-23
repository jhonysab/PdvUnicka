package com.UnickaDigital.pdv.repository;

import com.UnickaDigital.pdv.model.Locacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface LocacaoRepository extends JpaRepository<Locacao, Long> {

    // Locações por status
    List<Locacao> findByStatusOrderByDataEventoAsc(String status);

    boolean existsByClienteId(Long clienteId);

    // Locações com evento nos próximos N dias
    @Query("SELECT l FROM Locacao l WHERE l.dataEvento BETWEEN :hoje AND :limite AND l.status IN ('RESERVADO', 'ENTREGUE') ORDER BY l.dataEvento")
    List<Locacao> buscarProximas(@Param("hoje") LocalDate hoje, @Param("limite") LocalDate limite);

    // Locações por período de evento
    @Query("SELECT l FROM Locacao l WHERE l.dataEvento BETWEEN :inicio AND :fim ORDER BY l.dataEvento")
    List<Locacao> buscarPorPeriodo(@Param("inicio") LocalDate inicio, @Param("fim") LocalDate fim);
}
package com.UnickaDigital.pdv.repository;

import com.UnickaDigital.pdv.model.ItemCompra;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ItemCompraRepository extends JpaRepository<ItemCompra, Long> {
    List<ItemCompra> findAllByOrderByDataCriacaoDesc();
}

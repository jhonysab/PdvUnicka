package com.UnickaDigital.pdv;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Exige sessão logada para todas as rotas /api/**, exceto login e logout.
 * As páginas estáticas continuam abertas — sem sessão elas não obtêm dados.
 */
@Component
public class AuthFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        boolean ehApi   = path.startsWith("/api/");
        boolean ehLivre = path.equals("/api/auth/login") || path.equals("/api/auth/logout");

        if (ehApi && !ehLivre) {
            HttpSession session = request.getSession(false);
            if (session == null || session.getAttribute("username") == null) {
                response.setStatus(401);
                response.setContentType("text/plain;charset=UTF-8");
                response.getWriter().write("Sessão expirada. Faça login novamente.");
                return;
            }
        }

        chain.doFilter(request, response);
    }
}

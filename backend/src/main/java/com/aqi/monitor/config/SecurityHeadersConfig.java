package com.aqi.monitor.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@Configuration
public class SecurityHeadersConfig {

    @Bean
    public FilterRegistrationBean<SecurityHeadersFilter> securityHeadersFilter() {
        FilterRegistrationBean<SecurityHeadersFilter> registrationBean = new FilterRegistrationBean<>();
        registrationBean.setFilter(new SecurityHeadersFilter());
        registrationBean.addUrlPatterns("/*");
        return registrationBean;
    }

    public static class SecurityHeadersFilter implements Filter {
        @Override
        public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
                throws IOException, ServletException {
            HttpServletResponse httpServletResponse = (HttpServletResponse) response;

            // Allow everything for development/dashboard (including unsafe-eval for
            // charts/maps)
            httpServletResponse.setHeader("Content-Security-Policy",
                    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https://* http://*;" +
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://* http://*;" +
                            "style-src 'self' 'unsafe-inline' https://* http://*;" +
                            "img-src 'self' data: blob: https://* http://*;" +
                            "connect-src 'self' https://* http://* ws://* wss://*;");

            chain.doFilter(request, response);
        }
    }
}

package com.iflow.agent.config;

import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * 请求包装器 - 用于捕获请求体内容以便记录
 * 解决 InputStream 只能读取一次的问题
 */
public class RequestWrapper extends HttpServletRequestWrapper {

    private final byte[] cachedBody;

    public RequestWrapper(HttpServletRequest request) throws IOException {
        super(request);
        // 读取并缓存请求体
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        ServletInputStream inputStream = request.getInputStream();
        
        byte[] buffer = new byte[1024];
        int bytesRead;
        while ((bytesRead = inputStream.read(buffer)) != -1) {
            outputStream.write(buffer, 0, bytesRead);
        }
        
        this.cachedBody = outputStream.toByteArray();
    }

    @Override
    public ServletInputStream getInputStream() {
        return new CachedBodyServletInputStream(this.cachedBody);
    }

    /**
     * 获取请求体内容
     */
    public String getBody() {
        return new String(this.cachedBody, StandardCharsets.UTF_8);
    }

    /**
     * 获取请求体字节数
     */
    public int getBodyLength() {
        return this.cachedBody.length;
    }

    private static class CachedBodyServletInputStream extends ServletInputStream {

        private final ByteArrayInputStream inputStream;

        public CachedBodyServletInputStream(byte[] cachedBody) {
            this.inputStream = new ByteArrayInputStream(cachedBody);
        }

        @Override
        public boolean isFinished() {
            return inputStream.available() == 0;
        }

        @Override
        public boolean isReady() {
            return true;
        }

        @Override
        public void setReadListener(ReadListener readListener) {
            throw new UnsupportedOperationException();
        }

        @Override
        public int read() {
            return inputStream.read();
        }
    }
}

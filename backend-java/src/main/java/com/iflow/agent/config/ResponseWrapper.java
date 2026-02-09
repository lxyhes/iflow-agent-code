package com.iflow.agent.config;

import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.WriteListener;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletResponseWrapper;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintWriter;

/**
 * 响应包装器 - 用于捕获响应内容以便记录
 */
public class ResponseWrapper extends HttpServletResponseWrapper {

    private final ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
    private PrintWriter writer;

    public ResponseWrapper(HttpServletResponse response) {
        super(response);
    }

    @Override
    public ServletOutputStream getOutputStream() throws IOException {
        return new ServletOutputStream() {
            @Override
            public boolean isReady() {
                return true;
            }

            @Override
            public void setWriteListener(WriteListener writeListener) {
                throw new UnsupportedOperationException();
            }

            @Override
            public void write(int b) throws IOException {
                outputStream.write(b);
                getResponse().getOutputStream().write(b);
            }

            @Override
            public void write(byte[] b) throws IOException {
                outputStream.write(b);
                getResponse().getOutputStream().write(b);
            }

            @Override
            public void write(byte[] b, int off, int len) throws IOException {
                outputStream.write(b, off, len);
                getResponse().getOutputStream().write(b, off, len);
            }
        };
    }

    @Override
    public PrintWriter getWriter() throws IOException {
        if (writer == null) {
            writer = new PrintWriter(outputStream);
        }
        return writer;
    }

    public byte[] getContent() {
        if (writer != null) {
            writer.flush();
        }
        return outputStream.toByteArray();
    }

    public String getContentAsString() {
        String encoding = getCharacterEncoding();
        if (encoding == null) {
            encoding = "UTF-8";
        }
        try {
            return new String(getContent(), encoding);
        } catch (java.io.UnsupportedEncodingException e) {
            return new String(getContent(), java.nio.charset.StandardCharsets.UTF_8);
        }
    }
}
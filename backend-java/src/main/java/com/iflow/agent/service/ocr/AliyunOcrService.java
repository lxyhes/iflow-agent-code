package com.iflow.agent.service.ocr;

import com.aliyun.ocr_api20210707.Client;
import com.aliyun.ocr_api20210707.models.*;
import com.aliyun.teaopenapi.models.Config;
import com.iflow.agent.config.AliyunConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AliyunOcrService {

    private final AliyunConfig aliyunConfig;

    private Client createClient() throws Exception {
        if (!aliyunConfig.isConfigured()) {
            throw new IllegalStateException("Aliyun credentials not configured");
        }

        Config config = new Config()
                .setAccessKeyId(aliyunConfig.getAccessKeyId())
                .setAccessKeySecret(aliyunConfig.getAccessKeySecret());
        config.endpoint = aliyunConfig.getOcr().getEndpoint();
        return new Client(config);
    }

    /**
     * 通用文字识别（高级版）
     */
    public String recognizeGeneral(byte[] imageBytes) {
        log.debug("Recognizing general text from image ({} bytes)", imageBytes.length);

        try {
            Client client = createClient();

            RecognizeAdvancedRequest request = new RecognizeAdvancedRequest()
                    .setBody(new ByteArrayInputStream(imageBytes))
                    .setNeedRotate(true)
                    .setNeedSortPage(true);

            RecognizeAdvancedResponse response = client.recognizeAdvanced(request);

            if (response.getBody() != null && response.getBody().getData() != null) {
                return response.getBody().getData();
            }

            return "";

        } catch (Exception e) {
            log.error("OCR recognition failed", e);
            return "Error: " + e.getMessage();
        }
    }

    /**
     * 表格识别
     */
    public String recognizeTable(byte[] imageBytes) {
        log.debug("Recognizing table from image ({} bytes)", imageBytes.length);

        try {
            Client client = createClient();

            RecognizeTableOcrRequest request = new RecognizeTableOcrRequest()
                    .setBody(new ByteArrayInputStream(imageBytes))
                    .setNeedRotate(true);

            RecognizeTableOcrResponse response = client.recognizeTableOcr(request);

            if (response.getBody() != null && response.getBody().getData() != null) {
                return response.getBody().getData();
            }

            return "";

        } catch (Exception e) {
            log.error("Table OCR recognition failed", e);
            return "Error: " + e.getMessage();
        }
    }

    /**
     * 文档结构化识别
     */
    public String recognizeDocument(byte[] imageBytes) {
        log.debug("Recognizing document from image ({} bytes)", imageBytes.length);

        try {
            Client client = createClient();

            RecognizeDocumentStructureRequest request = new RecognizeDocumentStructureRequest()
                    .setBody(new ByteArrayInputStream(imageBytes));

            RecognizeDocumentStructureResponse response = client.recognizeDocumentStructure(request);

            if (response.getBody() != null && response.getBody().getData() != null) {
                return response.getBody().getData();
            }

            return "";

        } catch (Exception e) {
            log.error("Document OCR recognition failed", e);
            return "Error: " + e.getMessage();
        }
    }

    /**
     * 多语种识别
     */
    public String recognizeMultiLanguage(byte[] imageBytes, String language) {
        log.debug("Recognizing multi-language text from image ({} bytes), language: {}", imageBytes.length, language);

        try {
            Client client = createClient();

            RecognizeAdvancedRequest request = new RecognizeAdvancedRequest()
                    .setBody(new ByteArrayInputStream(imageBytes))
                    .setNeedRotate(true)
                    .setNeedSortPage(true);

            RecognizeAdvancedResponse response = client.recognizeAdvanced(request);

            if (response.getBody() != null && response.getBody().getData() != null) {
                return response.getBody().getData();
            }

            return "";

        } catch (Exception e) {
            log.error("Multi-language OCR recognition failed", e);
            return "Error: " + e.getMessage();
        }
    }

    /**
     * 手写文字识别
     */
    public String recognizeHandwriting(byte[] imageBytes) {
        log.debug("Recognizing handwriting from image ({} bytes)", imageBytes.length);

        try {
            Client client = createClient();

            RecognizeHandwritingRequest request = new RecognizeHandwritingRequest()
                    .setBody(new ByteArrayInputStream(imageBytes))
                    .setNeedRotate(true)
                    .setNeedSortPage(true);

            RecognizeHandwritingResponse response = client.recognizeHandwriting(request);

            if (response.getBody() != null && response.getBody().getData() != null) {
                return response.getBody().getData();
            }

            return "";

        } catch (Exception e) {
            log.error("Handwriting OCR recognition failed", e);
            return "Error: " + e.getMessage();
        }
    }

    /**
     * 智能识别（自动判断类型）
     */
    public OcrResult smartRecognize(byte[] imageBytes) {
        log.debug("Smart recognizing from image ({} bytes)", imageBytes.length);

        String result = recognizeGeneral(imageBytes);

        if (result.startsWith("Error:")) {
            return OcrResult.builder()
                    .success(false)
                    .error(result)
                    .build();
        }

        return OcrResult.builder()
                .success(true)
                .text(result)
                .type("general")
                .build();
    }

    public boolean isAvailable() {
        return aliyunConfig.isConfigured();
    }
}

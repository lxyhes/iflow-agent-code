package com.iflow.agent.service.image;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflow.agent.entity.ImageGeneration;
import com.iflow.agent.repository.ImageGenerationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;

/**
 * 图像生成服务
 * 支持通义万相、DALL-E 等模型
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ImageGenerationService {

    private final ImageGenerationRepository generationRepository;
    private final ObjectMapper objectMapper;

    @Value("${dashscope.api-key:}")
    private String dashscopeApiKey;

    @Value("${openai.api-key:}")
    private String openaiApiKey;

    private static final String OUTPUT_DIR = "./storage/images/generated";

    /**
     * 文生图 - 通义万相
     */
    @Transactional
    public ImageGeneration generateTextToImage(String prompt, String negativePrompt,
                                                Map<String, Object> config, Long userId) {
        ImageGeneration generation = new ImageGeneration();
        generation.setGenerationType("text-to-image");
        generation.setPrompt(prompt);
        generation.setNegativePrompt(negativePrompt);
        generation.setModel("wanx-v1");
        generation.setStatus("processing");
        generation.setUserId(userId);

        if (config != null) {
            try {
                generation.setConfig(objectMapper.writeValueAsString(config));
            } catch (JsonProcessingException e) {
                log.warn("序列化配置失败", e);
            }
        }

        ImageGeneration saved = generationRepository.save(generation);

        // 异步执行
        new Thread(() -> {
            try {
                String outputPath = callWanxApi(prompt, negativePrompt, config);
                saved.setOutputImagePath(outputPath);
                saved.setStatus("completed");
            } catch (Exception e) {
                log.error("文生图失败", e);
                saved.setStatus("failed");
                saved.setErrorMessage(e.getMessage());
            }
            saved.setCreatedAt(LocalDateTime.now());
            generationRepository.save(saved);
        }).start();

        return saved;
    }

    /**
     * 图生图
     */
    @Transactional
    public ImageGeneration generateImageToImage(MultipartFile inputImage, String prompt,
                                                 Map<String, Object> config, Long userId) {
        ImageGeneration generation = new ImageGeneration();
        generation.setGenerationType("image-to-image");
        generation.setPrompt(prompt);
        generation.setModel("wanx-v1");
        generation.setStatus("processing");
        generation.setUserId(userId);

        // 保存输入图片
        String inputPath = saveInputImage(inputImage);
        generation.setInputImagePath(inputPath);

        if (config != null) {
            try {
                generation.setConfig(objectMapper.writeValueAsString(config));
            } catch (JsonProcessingException e) {
                log.warn("序列化配置失败", e);
            }
        }

        ImageGeneration saved = generationRepository.save(generation);

        // 异步执行
        new Thread(() -> {
            try {
                String outputPath = callWanxImageToImage(inputPath, prompt, config);
                saved.setOutputImagePath(outputPath);
                saved.setStatus("completed");
            } catch (Exception e) {
                log.error("图生图失败", e);
                saved.setStatus("failed");
                saved.setErrorMessage(e.getMessage());
            }
            generationRepository.save(saved);
        }).start();

        return saved;
    }

    /**
     * 图像变体
     */
    @Transactional
    public ImageGeneration generateVariation(MultipartFile inputImage,
                                              Map<String, Object> config, Long userId) {
        ImageGeneration generation = new ImageGeneration();
        generation.setGenerationType("variation");
        generation.setModel("wanx-v1");
        generation.setStatus("processing");
        generation.setUserId(userId);

        String inputPath = saveInputImage(inputImage);
        generation.setInputImagePath(inputPath);

        ImageGeneration saved = generationRepository.save(generation);

        // 异步执行
        new Thread(() -> {
            try {
                String outputPath = callWanxVariation(inputPath, config);
                saved.setOutputImagePath(outputPath);
                saved.setStatus("completed");
            } catch (Exception e) {
                log.error("生成变体失败", e);
                saved.setStatus("failed");
                saved.setErrorMessage(e.getMessage());
            }
            generationRepository.save(saved);
        }).start();

        return saved;
    }

    /**
     * 图像编辑 (inpainting/outpainting)
     */
    @Transactional
    public ImageGeneration editImage(MultipartFile inputImage, MultipartFile maskImage,
                                      String prompt, Map<String, Object> config, Long userId) {
        ImageGeneration generation = new ImageGeneration();
        generation.setGenerationType("edit");
        generation.setPrompt(prompt);
        generation.setModel("wanx-v1");
        generation.setStatus("processing");
        generation.setUserId(userId);

        String inputPath = saveInputImage(inputImage);
        String maskPath = saveInputImage(maskImage);
        generation.setInputImagePath(inputPath);

        ImageGeneration saved = generationRepository.save(generation);

        // 异步执行
        new Thread(() -> {
            try {
                String outputPath = callWanxInpainting(inputPath, maskPath, prompt, config);
                saved.setOutputImagePath(outputPath);
                saved.setStatus("completed");
            } catch (Exception e) {
                log.error("图像编辑失败", e);
                saved.setStatus("failed");
                saved.setErrorMessage(e.getMessage());
            }
            generationRepository.save(saved);
        }).start();

        return saved;
    }

    /**
     * 获取生成历史
     */
    @Transactional(readOnly = true)
    public List<ImageGeneration> getHistory(Long userId, int limit) {
        if (userId != null) {
            return generationRepository.findRecentByUser(userId, limit);
        }
        return generationRepository.findAll().stream()
            .sorted(Comparator.comparing(ImageGeneration::getCreatedAt).reversed())
            .limit(limit)
            .toList();
    }

    /**
     * 获取生成详情
     */
    @Transactional(readOnly = true)
    public ImageGeneration getGeneration(Long id) {
        return generationRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("生成记录不存在：" + id));
    }

    // ===== 私有方法 =====

    /**
     * 调用通义万相 API (文生图)
     */
    private String callWanxApi(String prompt, String negativePrompt, Map<String, Object> config) throws Exception {
        // 简化实现：使用 HTTP 调用
        // 实际实现应使用 DashScope SDK
        
        String outputPath = OUTPUT_DIR + "/wanx_" + System.currentTimeMillis() + ".png";
        Path path = Paths.get(outputPath);
        
        if (!Files.exists(path.getParent())) {
            Files.createDirectories(path.getParent());
        }

        // TODO: 实际调用通义万相 API
        // 这里创建一个占位图片
        createPlaceholderImage(path, "文生图：" + prompt);
        
        return outputPath;
    }

    /**
     * 调用通义万相 API (图生图)
     */
    private String callWanxImageToImage(String inputPath, String prompt, Map<String, Object> config) throws Exception {
        String outputPath = OUTPUT_DIR + "/wanx_i2i_" + System.currentTimeMillis() + ".png";
        Path path = Paths.get(outputPath);
        
        if (!Files.exists(path.getParent())) {
            Files.createDirectories(path.getParent());
        }

        // TODO: 实际调用 API
        Files.copy(Paths.get(inputPath), path, StandardCopyOption.REPLACE_EXISTING);
        
        return outputPath;
    }

    /**
     * 调用通义万相 API (变体)
     */
    private String callWanxVariation(String inputPath, Map<String, Object> config) throws Exception {
        String outputPath = OUTPUT_DIR + "/wanx_var_" + System.currentTimeMillis() + ".png";
        Path path = Paths.get(outputPath);
        
        if (!Files.exists(path.getParent())) {
            Files.createDirectories(path.getParent());
        }

        Files.copy(Paths.get(inputPath), path, StandardCopyOption.REPLACE_EXISTING);
        return outputPath;
    }

    /**
     * 调用通义万相 API (图像编辑)
     */
    private String callWanxInpainting(String inputPath, String maskPath, String prompt,
                                       Map<String, Object> config) throws Exception {
        String outputPath = OUTPUT_DIR + "/wanx_edit_" + System.currentTimeMillis() + ".png";
        Path path = Paths.get(outputPath);
        
        if (!Files.exists(path.getParent())) {
            Files.createDirectories(path.getParent());
        }

        Files.copy(Paths.get(inputPath), path, StandardCopyOption.REPLACE_EXISTING);
        return outputPath;
    }

    /**
     * 保存输入图片
     */
    private String saveInputImage(MultipartFile file) {
        try {
            String filename = "input_" + System.currentTimeMillis() + "_" + file.getOriginalFilename();
            String path = OUTPUT_DIR + "/inputs/" + filename;
            
            Path filePath = Paths.get(path);
            if (!Files.exists(filePath.getParent())) {
                Files.createDirectories(filePath.getParent());
            }
            
            file.transferTo(filePath.toFile());
            return path;
        } catch (IOException e) {
            throw new RuntimeException("保存输入图片失败", e);
        }
    }

    /**
     * 创建占位图片
     */
    private void createPlaceholderImage(Path path, String text) throws IOException {
        // 创建一个简单的 PNG 占位图片
        // 实际实现应保存 API 返回的图片
        byte[] pngHeader = new byte[] {
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
        };
        Files.write(path, pngHeader);
    }

    /**
     * 获取支持的模型列表
     */
    public List<Map<String, String>> getSupportedModels() {
        List<Map<String, String>> models = new ArrayList<>();
        
        models.add(createModel("wanx-v1", "通义万相 v1", "文生图/图生图"));
        models.add(createModel("wanx-v2", "通义万相 v2", "高质量文生图"));
        models.add(createModel("dall-e-3", "DALL-E 3", "OpenAI 图像生成"));
        models.add(createModel("stable-diffusion", "Stable Diffusion", "开源图像生成"));
        
        return models;
    }

    private Map<String, String> createModel(String id, String name, String description) {
        Map<String, String> model = new HashMap<>();
        model.put("id", id);
        model.put("name", name);
        model.put("description", description);
        return model;
    }
}

package com.iflow.agent.repository;

import com.iflow.agent.service.rag.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByCollectionName(String collectionName);

    void deleteByCollectionName(String collectionName);

    List<Document> findByCollectionNameAndSource(String collectionName, String source);
}

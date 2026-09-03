package com.bunk.management.dto;

import lombok.Data;
import java.util.List;

@Data
public class SyncBatchRequest {
    private String batchId;
    private List<SyncItemDTO> items;
}

package com.hetex.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "tracking_page_configs")
public class TrackingPageConfig extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String userId;

    @Column(nullable = false)
    private String brandName = "HetEx";

    @Column(nullable = false)
    private String primaryColor = "#2c3958";

    private String logoUrl;
}

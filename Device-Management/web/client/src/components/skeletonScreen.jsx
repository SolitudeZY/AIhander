import React from "react";
import { Skeleton } from "antd";

export function SkeletonScreen() {
  return (
    <div style={{ padding: "20px" }}>
      <Skeleton.Input
        active
        style={{ width: "95%", height: 24, margin: "8px 0" }}
      />
      <Skeleton.Input
        active
        style={{ width: "80%", height: 28, margin: "16px 0" }}
      />
      <Skeleton.Input
        active
        style={{ width: "50%", height: 28, margin: "16px 0" }}
      />
      <Skeleton.Input
        active
        style={{ width: "60%", height: 28, margin: "16px 0" }}
      />
      <Skeleton.Input
        active
        style={{ width: "90%", height: 28, margin: "16px 0" }}
      />
      <Skeleton.Input
        active
        style={{ width: "70%", height: 28, margin: "16px 0" }}
      />
      <Skeleton.Input
        active
        style={{ width: "50%", height: 28, margin: "16px 0" }}
      />
      <Skeleton.Input
        active
        style={{ width: "40%", height: 28, margin: "16px 0" }}
      />
      <Skeleton.Input
        active
        style={{ width: "60%", height: 28, margin: "16px 0" }}
      />
      <Skeleton.Input
        active
        style={{ width: "40%", height: 28, margin: "16px 0" }}
      />
    </div>
  );
}

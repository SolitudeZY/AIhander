import React, { useState } from "react";
import { Tabs } from "antd";
import { connect } from "react-redux";
import ProductLibrary from "./productLibrary";
import Sensors from "./sensors";
import { isAuthorized } from "$utils";

function Product() {
  const [activeKey, setActiveKey] = useState(
    isAuthorized("VIEWPRODUCTLIST") ? "1" : "2",
  );

  const items = [];
  if (isAuthorized("VIEWPRODUCTLIST")) {
    items.push({
      key: "1",
      label: "产品列表",
      children: <ProductLibrary />,
    });
  }
  if (isAuthorized("VIEWSENSORLIST")) {
    items.push({
      key: "2",
      label: "传感器列表",
      children: <Sensors />,
    });
  }

  return (
    <section className="product-library-page">
      <header className="product-library-page__header">
        <span className="product-library-page__title" style={{fontWeight:500}}>产品库</span>
        <span className="product-library-page__subtitle">PRODUCT LIBRARY</span>
      </header>
      <Tabs
        className="product-library-page__tabs"
        activeKey={activeKey}
        onChange={setActiveKey}
        items={items}
      />
    </section>
  );
}
function mapStateToProps(state) {
  const { auth, global, productLibrary } = state;
  return {
    user: auth.user,
    actions: global.actions,
    productLibrary: productLibrary.data,
    loading: productLibrary.isRequesting,
  };
}
export default connect(mapStateToProps)(Product);

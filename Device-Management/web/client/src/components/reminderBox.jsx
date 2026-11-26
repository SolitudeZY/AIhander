import { Button, Checkbox, Modal } from 'antd';
import React from "react";

const ReminderBox = ({ title, wait, toadd, visible, onOk, close, USER}) => {
    return (
        <Modal
            title={
                <div style={{ fontSize: 14, lineHeight: "35px", marginLeft: 16 }}>
                    {title}
                </div>
            }
            onCancel={() => {
                close()
            }}
            icon={
                <img
                    src="../../assets/images/logo/figure.png"
                    style={{ width: 40, height: 40 }}
                />
            }
            footer={
                <div
                    style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-between",
                    }}
                >
                    <Checkbox
                        onChange={(checked) =>{
                             localStorage.setItem( USER, JSON.stringify(checked.target.checked)
                            )
                            }}
                        aria-label="Checkbox 示例"
                        style={{ width: 100 }}
                    >
                        不再提醒
                    </Checkbox>
                    <div>
                        <Button onClick={() => close()}>{wait}</Button>
                        <Button theme="solid" onClick={() => onOk()}>{toadd}</Button>
                    </div>
                </div>
            }
            open={visible}
        ></Modal>
    );
};

export default ReminderBox;

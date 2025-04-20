import React from 'react';
import { Modal, Card, Row, Col, Button } from 'antd';

export const TemplateSelectionModal = ({ visible, onCancel, onSelect }) => {
  const templates = [
    { id: 'blank', name: 'Blank Form', description: 'Start with a blank form' },
    { id: 'contact', name: 'Contact Form', description: 'Basic contact information' },
    { id: 'survey', name: 'Survey', description: 'Collect user feedback' }
  ];

  return (
    <Modal
      title="Select a Template"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Button type="primary" onClick={() => onSelect(null)}>
            Blank Form
          </Button>
        </Col>
        {templates.map(template => (
          <Col span={8} key={template.id}>
            <Card
              hoverable
              title={template.name}
              onClick={() => onSelect(template.id)}
            >
              {template.description}
            </Card>
          </Col>
        ))}
      </Row>
    </Modal>
  );
};

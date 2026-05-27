# Multilingual E5 Base Model

This directory should contain the ONNX-exported multilingual-e5-base model.

## Export Instructions

1. Install dependencies:

   ```bash
   pip install transformers optimum[onnxruntime]
   ```

2. Export to ONNX:

   ```bash
   optimum-cli export onnx --model intfloat/multilingual-e5-base ./model.onnx
   ```

3. Place the exported `model.onnx` file in this directory.

## Model Details

- **Source**: intfloat/multilingual-e5-base (HuggingFace)
- **Output Dimension**: 768
- **Languages**: 100+ languages including Hindi, Bengali, Tamil, Telugu, etc.
- **Max Sequence Length**: 512 tokens
- **Use Case**: Multilingual text embeddings for Indic language content

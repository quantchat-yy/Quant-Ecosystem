# Neural CF Model (Version 1)

This directory should contain the exported ONNX model file (`model.onnx`).

## Exporting the Model

To export the Neural Collaborative Filtering model to ONNX format:

1. Train the model using the training pipeline (see `packages/ml-pipeline/`)
2. Export using PyTorch or the training framework's ONNX export utility:

```python
import torch

# After training your NCF model:
dummy_user = torch.tensor([[1]], dtype=torch.int64)
dummy_item = torch.tensor([[1]], dtype=torch.int64)

torch.onnx.export(
    model,
    (dummy_user, dummy_item),
    "model.onnx",
    input_names=["user_ids", "item_ids"],
    output_names=["scores"],
    dynamic_axes={
        "user_ids": {0: "batch_size"},
        "item_ids": {0: "batch_size"},
        "scores": {0: "batch_size"},
    },
    opset_version=17,
)
```

3. Place the resulting `model.onnx` file in this directory.

## Model Inputs

- `user_ids`: INT64 tensor of shape `[batch_size, 1]`
- `item_ids`: INT64 tensor of shape `[batch_size, 1]`

## Model Outputs

- `scores`: FP32 tensor of shape `[batch_size, 1]` (interaction probability)

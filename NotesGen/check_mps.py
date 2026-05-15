import torch

print("PyTorch version:", torch.__version__)

if not torch.backends.mps.is_built():
    print("❌ MPS backend not built into this PyTorch version.")
elif not torch.backends.mps.is_available():
    print("⚠️ MPS is built, but not available on this system or inactive environment.")
    print("   -> Try deactivating conda (run `conda deactivate`) or reinstalling PyTorch with:")
    print("      pip install torch torchvision torchaudio")
else:
    print("✅ MPS backend is built and available!")
    x = torch.rand(3, 3, device="mps")
    y = torch.rand(3, 3, device="mps")
    z = x @ y
    print("MPS test successful:", z)

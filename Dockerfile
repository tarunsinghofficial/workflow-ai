# Use Trigger.dev base image
FROM ghcr.io/triggerdotdev/trigger.dev:latest

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Verify FFmpeg installation
RUN ffmpeg -version

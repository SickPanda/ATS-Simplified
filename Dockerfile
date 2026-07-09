FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Install native dependencies for drawing and PDF rendering on Linux
RUN apt-get update && apt-get install -y \
    libgdiplus \
    libc6-dev \
    tar \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Download and extract libpdfium.so for Linux-x64
RUN curl -L https://github.com/bblanchon/pdfium-binaries/releases/download/chromium%2F6124/pdfium-linux-x64.tgz -o pdfium.tgz \
    && tar -xvf pdfium.tgz \
    && cp lib/libpdfium.so /app/ \
    && mkdir -p /app/runtimes/linux-x64/native/ \
    && cp lib/libpdfium.so /app/runtimes/linux-x64/native/ \
    && rm -rf lib/ pdfium.tgz

COPY publish_output/ .

# Default port 8080
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "AtsApi.dll"]

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY publish_output/ .

# Default port 8080
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "AtsApi.dll"]

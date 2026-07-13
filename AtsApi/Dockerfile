FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["AtsApi.csproj", "."]
RUN dotnet restore "AtsApi.csproj"
COPY . .
RUN dotnet publish "AtsApi.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Create persistent data directory for SQLite
RUN mkdir -p /data

# Render passes PORT env var; ASP.NET Core must listen on it
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

ENTRYPOINT ["dotnet", "AtsApi.dll"]

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["AtsApi/AtsApi.csproj", "AtsApi/"]
RUN dotnet restore "AtsApi/AtsApi.csproj"
COPY . .
WORKDIR "/src/AtsApi"
RUN dotnet build "AtsApi.csproj" -c Release -o /app/build
RUN dotnet publish "AtsApi.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Hugging Face Spaces runs on port 7860
ENV ASPNETCORE_URLS=http://+:7860
EXPOSE 7860

ENTRYPOINT ["dotnet", "AtsApi.dll"]

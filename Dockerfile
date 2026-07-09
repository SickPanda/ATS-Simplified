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

# Default port 8080
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "AtsApi.dll"]

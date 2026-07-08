FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["AtsApi.csproj", "."]
RUN dotnet restore "AtsApi.csproj"
COPY . .
RUN dotnet build "AtsApi.csproj" -c Release -o /app/build
RUN dotnet publish "AtsApi.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# The database and uploaded resumes will be mounted to /app/data
# We'll override the connection string via env variable in render.yaml

ENTRYPOINT ["dotnet", "AtsApi.dll"]

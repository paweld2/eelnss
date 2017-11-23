FROM alpine
RUN apk update
RUN apk upgrade
RUN apk add nodejs nodejs-npm
COPY . /app
WORKDIR /app

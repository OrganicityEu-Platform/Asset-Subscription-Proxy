FROM node:6.10.0
MAINTAINER Dennis Boldt info@dennis-boldt.de
EXPOSE 9999
RUN mkdir -p /opt/organicity-asset-subscription-proxy
WORKDIR /opt/organicity-asset-subscription-proxy
ADD . /opt/organicity-asset-subscription-proxy
RUN npm install
CMD ["/bin/bash", "init.sh"]

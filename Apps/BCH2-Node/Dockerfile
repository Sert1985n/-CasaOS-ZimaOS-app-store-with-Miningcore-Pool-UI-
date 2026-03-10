FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libtool autotools-dev automake pkg-config python3 \
    libevent-dev libboost-dev libsqlite3-dev libminiupnpc-dev libnatpmp-dev \
    libzmq3-dev systemtap-sdt-dev libqrencode-dev libdb-dev libdb++-dev \
    git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /opt
RUN git clone --depth 1 --branch v27.0.0 https://github.com/BitcoincashII/bitcoincashII-core.git src
WORKDIR /opt/src
RUN ./autogen.sh && mkdir -p build && cd build && \
    ../configure --without-gui --disable-tests --disable-bench && make -j"$(nproc)"
RUN install -m 0755 /opt/src/build/src/bitcoincashIId /usr/local/bin/bitcoincashIId && \
    install -m 0755 /opt/src/build/src/bitcoincashII-cli /usr/local/bin/bitcoincashII-cli && \
    install -m 0755 /opt/src/build/src/bitcoincashII-tx /usr/local/bin/bitcoincashII-tx 2>/dev/null || true
VOLUME ["/root/.bitcoincashII"]
ENTRYPOINT ["/usr/local/bin/bitcoincashIId"]
CMD ["-printtoconsole","-server","-prune=550","-wallet=default","-zmqpubhashblock=tcp://127.0.0.1:7033","-rpcbind=0.0.0.0","-rpcport=9033","-rpcallowip=0.0.0.0/0","-rpcuser=pooluser","-rpcpassword=poolpassword","-port=8339","-datadir=/root/.bitcoincashII"]

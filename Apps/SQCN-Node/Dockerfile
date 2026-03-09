FROM ubuntu:22.04 AS builder
RUN apt-get update && apt-get install -y \
    build-essential libtool autotools-dev automake pkg-config bsdmainutils python3 \
    libssl-dev libevent-dev libboost-all-dev libdb5.3++-dev libdb5.3-dev \
    libzmq3-dev git wget curl && rm -rf /var/lib/apt/lists/*

WORKDIR /build
RUN git clone --depth 1 https://github.com/nicehash/SequenceCoin.git coin-src
WORKDIR /build/coin-src
RUN ./autogen.sh 2>/dev/null || true && \
    ./configure --without-gui --disable-tests --disable-bench  && \
    make -j$(nproc) && make install

FROM ubuntu:22.04
RUN apt-get update && apt-get install -y \
    libboost-system1.74.0 libboost-filesystem1.74.0 libboost-thread1.74.0 \
    libboost-program-options1.74.0 libboost-chrono1.74.0 \
    libdb5.3 libevent-2.1-7 libzmq5 libssl3 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/local/bin/sqcnd /usr/local/bin/
COPY --from=builder /usr/local/bin/sqcn-cli /usr/local/bin/ 2>/dev/null || true
ENTRYPOINT ["sqcnd"]

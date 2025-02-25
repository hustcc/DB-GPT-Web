'use client';

import React, { useMemo, useState } from 'react';
import { useAsyncEffect } from 'ahooks';
import { Badge, Button, Card, Drawer, Empty, Modal, Spin, message } from 'antd';
import FormDialog from '@/components/database/form-dialog';
import { apiInterceptors, getDbList, getDbSupportType, postDbDelete } from '@/client/api';
import DBCard from '@/components/database/db-card';
import { DeleteFilled, EditFilled, PlusOutlined } from '@ant-design/icons';
import { DBOption, DBType, DbListResponse, DbSupportTypeResponse } from '@/types/db';
import MuiLoading from '@/components/common/loading';

type DBItem = DbListResponse[0];

const dbMapper: Record<DBType, { label: string; icon: string; desc: string }> = {
  mysql: { label: 'MySQL', icon: '/icons/mysql.png', desc: 'Fast, reliable, scalable open-source relational database management system.' },
  mssql: { label: 'MSSQL', icon: '/icons/mssql.png', desc: 'Powerful, scalable, secure relational database system by Microsoft.' },
  duckdb: { label: 'DuckDB', icon: '/icons/duckdb.png', desc: 'In-memory analytical database with efficient query processing.' },
  sqlite: { label: 'Sqlite', icon: '/icons/sqlite.png', desc: 'Lightweight embedded relational database with simplicity and portability.' },
  clickhouse: { label: 'ClickHouse', icon: '/icons/clickhouse.png', desc: 'Columnar database for high-performance analytics and real-time queries.' },
  oracle: { label: 'Oracle', icon: '/icons/oracle.png', desc: 'Robust, scalable, secure relational database widely used in enterprises.' },
  access: { label: 'Access', icon: '/icons/access.png', desc: 'Easy-to-use relational database for small-scale applications by Microsoft.' },
  mongodb: { label: 'MongoDB', icon: '/icons/mongodb.png', desc: 'Flexible, scalable NoSQL document database for web and mobile apps.' },
  db2: { label: 'DB2', icon: '/icons/db2.png', desc: 'Scalable, secure relational database system developed by IBM.' },
  hbase: { label: 'HBase', icon: '/icons/hbase.png', desc: 'Distributed, scalable NoSQL database for large structured/semi-structured data.' },
  redis: { label: 'Redis', icon: '/icons/redis.png', desc: 'Fast, versatile in-memory data structure store as cache, DB, or broker.' },
  cassandra: { label: 'Cassandra', icon: '/icons/cassandra.png', desc: 'Scalable, fault-tolerant distributed NoSQL database for large data.' },
  couchbase: { label: 'Couchbase', icon: '/icons/couchbase.png', desc: 'High-performance NoSQL document database with distributed architecture.' },
  postgresql: {
    label: 'PostgreSQL',
    icon: '/icons/postgresql.png',
    desc: 'Powerful open-source relational database with extensibility and SQL standards.',
  },
  spark: { label: 'Spark', icon: '/icons/spark.png', desc: 'Unified engine for large-scale data analytics.' },
};

export function isFileDb(dbTypeList: DBOption[], dbType: DBType) {
  return dbTypeList.find((item) => item.value === dbType)?.isFileDb;
}

function Database() {
  const [dbList, setDbList] = useState<DbListResponse>([]);
  const [dbSupportList, setDbSupportList] = useState<DbSupportTypeResponse>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; info?: DBItem; dbType?: DBType }>({ open: false });
  const [draw, setDraw] = useState<{ open: boolean; dbList?: DbListResponse; name?: string; type?: DBType }>({ open: false });

  const getDbSupportList = async () => {
    const [_, data] = await apiInterceptors(getDbSupportType());
    setDbSupportList(data ?? []);
  };

  const refreshDbList = async () => {
    setLoading(true);
    const [_, data] = await apiInterceptors(getDbList());
    setDbList(data ?? []);
    setLoading(false);
  };

  const dbTypeList = useMemo(() => {
    const supportDbList = dbSupportList.map((item) => {
      const { db_type, is_file_db } = item;
      return { ...dbMapper[db_type], value: db_type, isFileDb: is_file_db };
    }) as DBOption[];
    const unSupportDbList = Object.keys(dbMapper)
      .filter((item) => !supportDbList.some((db) => db.value === item))
      .map((item) => ({ ...dbMapper[item], value: dbMapper[item].label, disabled: true })) as DBOption[];
    return [...supportDbList, ...unSupportDbList];
  }, [dbSupportList]);

  const onModify = (item: DBItem) => {
    setModal({ open: true, info: item });
  };

  const onDelete = (item: DBItem) => {
    Modal.confirm({
      title: 'Tips',
      content: `Do you Want to delete the ${item.db_name}?`,
      onOk() {
        return new Promise<void>(async (resolve, reject) => {
          try {
            const [err] = await apiInterceptors(postDbDelete(item.db_name));
            if (err) {
              message.error(err.message);
              reject();
              return;
            }
            message.success('success');
            refreshDbList();
            resolve();
          } catch (e: any) {
            reject();
          }
        });
      },
    });
  };

  const dbListByType = useMemo(() => {
    const mapper = dbTypeList.reduce((acc, item) => {
      acc[item.value] = dbList.filter((dbConn) => dbConn.db_type === item.value);
      return acc;
    }, {} as Record<DBType, DbListResponse>);
    return mapper;
  }, [dbList, dbTypeList]);

  useAsyncEffect(async () => {
    await refreshDbList();
    await getDbSupportList();
  }, []);

  const handleDbTypeClick = (info: DBOption) => {
    const dbItems = dbList.filter((item) => item.db_type === info.value);
    setDraw({ open: true, dbList: dbItems, name: info.label, type: info.value });
  };

  return (
    <div className="relative p-4 md:p-6 bg-[#FAFAFA] dark:bg-transparent min-h-full overflow-y-auto">
      <MuiLoading visible={loading} />
      <div className="mb-4">
        <Button
          type="primary"
          className="flex items-center"
          icon={<PlusOutlined />}
          onClick={() => {
            setModal({ open: true });
          }}
        >
          Create
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 md:gap-4">
        {dbTypeList.map((item) => (
          <Badge key={item.value} count={dbListByType[item.value].length}>
            <DBCard
              info={item}
              onClick={() => {
                handleDbTypeClick(item);
              }}
            />
          </Badge>
        ))}
      </div>
      <FormDialog
        open={modal.open}
        dbTypeList={dbTypeList}
        choiceDBType={modal.dbType}
        editValue={modal.info}
        dbNames={dbList.map((item) => item.db_name)}
        onSuccess={() => {
          setModal({ open: false });
          refreshDbList();
        }}
        onClose={() => {
          setModal({ open: false });
        }}
      />
      <Drawer
        title={draw.name}
        placement="right"
        onClose={() => {
          setDraw({ open: false });
        }}
        open={draw.open}
      >
        {draw.type && dbListByType[draw.type] && dbListByType[draw.type].length ? (
          <>
            <Button
              type="primary"
              className="mb-4 flex items-center"
              icon={<PlusOutlined />}
              onClick={() => {
                setModal({ open: true, dbType: draw.type });
              }}
            >
              Create
            </Button>
            {dbListByType[draw.type].map((item) => (
              <Card
                key={item.db_name}
                title={item.db_name}
                extra={
                  <>
                    <EditFilled
                      className="mr-2"
                      style={{ color: '#1b7eff' }}
                      onClick={() => {
                        onModify(item);
                      }}
                    />
                    <DeleteFilled
                      style={{ color: '#ff1b2e' }}
                      onClick={() => {
                        onDelete(item);
                      }}
                    />
                  </>
                }
                className="mb-4"
              >
                {item.db_path ? (
                  <p>path: {item.db_path}</p>
                ) : (
                  <>
                    <p>host: {item.db_host}</p>
                    <p>username: {item.db_user}</p>
                    <p>port: {item.db_port}</p>
                  </>
                )}
                <p>remark: {item.comment}</p>
              </Card>
            ))}
          </>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_DEFAULT}>
            <Button
              type="primary"
              className="flex items-center mx-auto"
              icon={<PlusOutlined />}
              onClick={() => {
                setModal({ open: true, dbType: draw.type });
              }}
            >
              Create Now
            </Button>
          </Empty>
        )}
      </Drawer>
    </div>
  );
}

export default Database;
